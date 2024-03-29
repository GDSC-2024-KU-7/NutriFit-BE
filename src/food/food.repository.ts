import { Between, LessThan, Like, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { FOOD } from './entities/food.entity';
import { searchFoodDto } from './dto/search-food.dto';
import { min } from 'class-validator';

@Injectable()
export class FoodRepository extends Repository<FOOD> {
  constructor(
    @InjectRepository(FOOD) private readonly repository: Repository<FOOD>,
  ) {
    super(repository.target, repository.manager);
  }

  async foodSearch(food_name: string, group: string) {
    var searchresult;
    if (group) {
      var li1 = await this.repository.find({ where: { food_name: food_name, DB_group: Like(`${group}`) }});
      var li2 = await this.repository.find({ where: { food_name: Like(`%_${food_name}`), DB_group: Like(`${group}`) } });
      var li3 = await this.repository.find({ where: { food_name: Like(`${food_name}_%`), DB_group: Like(`${group}`) } });
      var li4 = await this.repository.find({ where: { food_name: Like(`%_${food_name}_%`), DB_group: Like(`${group}`) } });

      searchresult = li1.concat(li2, li3, li4);
    } else{
      var li1 = await this.repository.find({ where: { food_name: food_name } });
      var li2 = await this.repository.find({ where: { food_name: Like(`%_${food_name}`) } });
      var li3 = await this.repository.find({ where: { DB_group: Like(`${food_name}_%`) } });
      var li4 = await this.repository.find({ where: { food_name: Like(`%_${food_name}_%`) } });
      
      searchresult = li1.concat(li2, li3, li4);
    }
    const deduplication = [
      ...new Map(
        searchresult.map((m) => [`${m.food_name}_${m.region}`, m]),
      ).values(),
    ];
    return deduplication;
  }

  async findByNO(NO: number): Promise<FOOD> {
    return await this.repository.findOne({ where: { NO } });
  }

  async recommendBySearch(search: searchFoodDto) {
    const norm = 5
    var key = 2;
    var li = [];

    while(li.length < 10 && key < 10){
      li = await this.repository.find({where: [{DB_group: '음식', energy_kcal: Between(search.energy_kcal*((100-key)/100),search.energy_kcal*((100+key)/100)), protein_g: Between(search.protein_g*((100-key)/100),search.protein_g*((100+key)/100)), fat_g: Between(search.fat_g*((100-key)/100),search.fat_g*((100+key)/100)), carbohydrate_g: Between(search.carbohydrate_g*((100-key)/100),search.carbohydrate_g*((100+key)/100))}]});
      key+=2;
    }
    if (li.length >= 10) {
      const deduplication = [
        ...new Map(
          li.map((m) => [`${m.food_name}_${m.region}`, m]),
        ).values(),
      ];
      return deduplication;
    }

    let minValue = search.nutrifit_percent[0]; // 최소값 초기화
    let minIndex = 0; // 최소값 인덱스 초기화

    // 배열을 순회하면서 최소값 및 해당 인덱스 찾기
    for (let i = 1; i < search.nutrifit_percent.length; i++) {
      if (search.nutrifit_percent[i] < minValue) {
        minValue = search.nutrifit_percent[i];
        minIndex = i;
      }
    }
    key = 2;
    
    search.energy_kcal = search.energy_kcal < 0 ? 0 : search.energy_kcal;
    search.protein_g = search.protein_g < 0 ? 0 : search.protein_g;
    search.fat_g = search.fat_g < 0 ? 0 : search.fat_g;
    search.carbohydrate_g = search.carbohydrate_g < 0 ? 0 : search.carbohydrate_g;

    switch (minIndex+1) {
      case 1:
        while(li.length < 10 && key < 10){
          li = await this.repository.find({where: [{DB_group: '음식', energy_kcal: Between(search.energy_kcal*((100-key)/100),search.energy_kcal*((100+key)/100)), protein_g: LessThan(search.protein_g*((100+norm)/100)), fat_g: LessThan(search.fat_g*((100+norm)/100)), carbohydrate_g: LessThan(search.carbohydrate_g*((100+norm)/100))}]});
          key+=2;
        }
        break;
      case 2:
        while(li.length < 10 && key < 10){
          li = await this.repository.find({where: [{DB_group: '음식', energy_kcal: LessThan(search.energy_kcal*((100+norm)/100)), protein_g: Between(search.protein_g*((100-key)/100),search.protein_g*((100+key)/100)), fat_g: LessThan(search.fat_g*((100+norm)/100)), carbohydrate_g: LessThan(search.carbohydrate_g*((100+norm)/100))}]});
          key+=2;
        }
        break;
      case 3:
        while(li.length < 10 && key < 10){
          li = await this.repository.find({where: [{DB_group: '음식', energy_kcal: LessThan(search.energy_kcal*((100+norm)/100)), protein_g: LessThan(search.protein_g*((100+norm)/100)), fat_g: Between(search.fat_g*((100-key)/100), search.fat_g*((100+key)/100)), carbohydrate_g: LessThan(search.carbohydrate_g*((100+norm)/100))}]});
          key+=2;
        }
        break;
      case 4:
        while(li.length < 10 && key < 10){  
          li = await this.repository.find({where: [{DB_group: '음식', energy_kcal: LessThan(search.energy_kcal*((100+norm)/100)), protein_g: LessThan(search.protein_g*((100+norm)/100)), fat_g: LessThan(search.fat_g*((100+norm)/100)), carbohydrate_g: Between(search.carbohydrate_g*((100-key)/100), search.carbohydrate_g*((100+key)/100))}]});
          key+=2;
        }
        break;
      default:
        return 'input error';
    }
    const deduplication = [
      ...new Map(
        li.map((m) => [`${m.food_name}_${m.region}`, m]),
      ).values(),
    ];
    return deduplication;
  }
}
